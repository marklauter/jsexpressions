// a single cached value with a time-based expiration
function ExpirableCacheItem(data, name, expirationTimespan, isFloatingExpiration, onExpire) {
    "use strict";

    this.Data = data;
    this.Name = name;
    this.ExpirationTimeSpan = expirationTimespan;
    this.IsFloatingExpiration = isFloatingExpiration;
    this.OnExpire = onExpire;
    this.ExpirationTimeoutId = null;

    this.expire = function () {
        if (this.OnExpire !== null) {
            this.OnExpire(this);
        }
    };
}

// a cached collection that refreshes itself on an interval by calling read().
// options: { cache, updatedCallback, failureCallback, transform, expression, params, hashIndexColumns }
function UpdatableCacheItem(name, typeName, updateIntervalInSeconds, options) {
    "use strict";

    options = options || {};

    var self = this,
        locked = false,
        lockOwner = null,
        cache = options.cache || null,
        updatedCallback = options.updatedCallback || null,
        failureCallback = options.failureCallback || null,
        transform = options.transform || null,
        hashIndexColumns = options.hashIndexColumns || null,
        statistics = [];

    this.Name = name;
    this.TypeName = typeName;
    this.Expression = options.expression || null;
    this.Params = options.params || null;
    this.UpdateIntervalInSeconds = updateIntervalInSeconds;
    this.Data = null;
    this.Version = 0;
    this.UpdateIntervalId = null;

    this.getHashValue = function (item) {
        var lResult = null,
            i,
            lLength = 0,
            lList = null;
        if (hashIndexColumns !== null) {
            lList = [];
            lLength = hashIndexColumns.length;
            for (i = 0; i < lLength; i++) {
                lList.push(item[hashIndexColumns[i]]);
                lList.push('.');
            }
            lResult = lList.join('');
        } else {
            lResult = item.Id;
        }
        return lResult;
    };

    this.runExpression = function () {
        if (self.Expression !== null) {
            self.Data = query(self.Data, self.Expression);
        }
    };

    function setVersion(newData) {
        var lIsChanged = false,
            lMaxVersion,
            i;
        if (!isNullOrUndefined(newData)) {
            if (newData instanceof Array) {
                lMaxVersion = self.Version;
                for (i = 0; i < newData.length; i++) {
                    if (typeof newData[i].Version === 'undefined') {
                        break; // if the first item is unversioned, so will the rest be
                    }
                    if (newData[i].Version > lMaxVersion) {
                        lMaxVersion = newData[i].Version;
                        lIsChanged = true;
                    }
                }
                self.Version = lMaxVersion;
            } else if (typeof newData.Version !== 'undefined') {
                self.Version = newData.Version;
                lIsChanged = true;
            }
        }
        return lIsChanged;
    }

    function assignAllData(newData) {
        var i,
            lItem;
        self.Data = {};
        if (newData instanceof Array) {
            if (transform !== null) {
                transform(newData);
            }
            for (i = 0; i < newData.length; i++) {
                lItem = newData[i];
                self.Data[self.getHashValue(lItem)] = lItem;
            }
        } else {
            self.Data = newData;
        }
        return setVersion(newData);
    }

    function synchronizeData(newData) {
        var lIsChanged = false,
            i,
            lNewItem,
            lOldItem,
            lIsOldItemDefined,
            lNewItemHasVersion,
            lOldItemHasVersion;
        if (!isNullOrUndefined(newData)) {
            if (self.Data === null) {
                // data never set before, go set up the hash
                lIsChanged = assignAllData(newData);
            } else if (newData instanceof Array) {
                if (transform !== null) {
                    transform(newData);
                }
                for (i = 0; i < newData.length; i++) {
                    lNewItem = newData[i];
                    lOldItem = self.Data[self.getHashValue(lNewItem)];
                    lIsOldItemDefined = typeof lOldItem !== 'undefined';
                    lNewItemHasVersion = typeof lNewItem.Version !== 'undefined';
                    lOldItemHasVersion = lIsOldItemDefined && typeof lOldItem.Version !== 'undefined';

                    if ((!lIsOldItemDefined) ||
                            (!lNewItemHasVersion && !lOldItemHasVersion) ||
                            (lNewItem.Version > lOldItem.Version)) {
                        self.Data[self.getHashValue(lNewItem)] = lNewItem;
                    }
                }
                self.runExpression();
            } else if ((typeof newData.Version === 'undefined') || (newData.Version > self.Data.Version)) {
                // inbound data isn't an array
                self.Data = newData;
            }
            // must run last or the version is never set
            lIsChanged = (setVersion(newData) || lIsChanged);
        }
        return lIsChanged;
    }

    function acquireLock(owner) {
        var lResult = !locked;
        if (lResult) {
            locked = true;
            lockOwner = owner;
        }
        return lResult;
    }

    function releaseLock(owner) {
        if (lockOwner === owner) {
            locked = false;
            lockOwner = null;
        }
    }

    function updateSuccessCallback(params, data) {
        var lPreviousVersion = self.Version,
            lIsChanged = (lPreviousVersion === 0),
            lStopTime,
            lSpan;
        // must run first or the data is never set
        lIsChanged = (synchronizeData(data) || lIsChanged);
        releaseLock('update');

        lStopTime = new Date();
        lSpan = lStopTime - params.startTime;
        statistics[params.startTime.getTime()] = { 'timeSpan': lSpan, 'itemCount': data.length };

        if (cache !== null) {
            cache.trigger(self.Name + 'complete', self);
        }
        if (updatedCallback !== null && lIsChanged) {
            updatedCallback(self);
        }
    }

    function updateFailureCallback(params, request, status, error) {
        releaseLock('update');
        if (!isNullOrUndefined(failureCallback)) {
            failureCallback(self, request, status, error, params);
        }
    }

    function fetchData() {
        var lStart = new Date();
        read(self.TypeName, self.Expression, self.Version, updateSuccessCallback, updateFailureCallback, { 'startTime': lStart }, null, 0);
    }

    this.update = function () {
        if (acquireLock('update')) {
            fetchData();
        }
    };

    this.getStatistics = function () {
        return statistics;
    };
}

// a client-side data cache holding expirable and self-updating items.
// inherits the bind/trigger event system from EventEmitter; events fired: added, complete, updated
function Cache() {
    "use strict";

    EventEmitter.call(this);

    var self = this,
        expirableItems = {},
        updatableItems = {};

    function initializeUpdateTimer(cacheItem) {
        cacheItem.UpdateIntervalId = window.setInterval(function () { cacheItem.update(); }, cacheItem.UpdateIntervalInSeconds * 1000);
    }

    function initializeExpirationTimer(cacheItem) {
        cacheItem.ExpirationTimeoutId = window.setTimeout(function () { self.expireItem(cacheItem.Name); }, cacheItem.ExpirationTimeSpan * 1000);
    }

    function onItemUpdate(item) {
        self.trigger(item.Name + 'updated', item);
    }

    this.getItem = function (name) {
        var lResult = expirableItems[name];
        if (isNullOrUndefined(lResult)) {
            lResult = updatableItems[name];
        }
        return lResult;
    };

    this.removeItem = function (name) {
        var lResult = this.removeExpirableItem(name);
        if (isNullOrUndefined(lResult)) {
            lResult = this.removeUpdatableItem(name);
        }
        return lResult;
    };

    this.addUpdatableItem = function (name, typeName, updateIntervalInSeconds, options) {
        options = options || {};
        options.cache = this;
        options.updatedCallback = onItemUpdate;

        var lCacheItem = new UpdatableCacheItem(name, typeName, updateIntervalInSeconds, options);
        updatableItems[name] = lCacheItem;
        this.trigger(name + 'added', lCacheItem);

        // fetch now, then stagger the refresh loop so many items don't fire at once
        lCacheItem.update();
        window.setTimeout(function () { initializeUpdateTimer(lCacheItem); }, Math.floor((Math.random() * 60) + 1) * 1000);

        return lCacheItem;
    };

    this.getUpdatableItem = function (name) {
        return updatableItems[name];
    };

    this.removeUpdatableItem = function (name) {
        var lResult = updatableItems[name];
        if (!isNullOrUndefined(lResult)) {
            window.clearInterval(lResult.UpdateIntervalId);
            updatableItems[name] = null;
        }
        return lResult;
    };

    this.addExpirableItem = function (data, name, expirationTimespan, isFloatingExpiration, onExpire) {
        var lIsFloatingExpiration = (expirationTimespan !== 0 && isFloatingExpiration),
            lCacheItem = new ExpirableCacheItem(data, name, expirationTimespan, lIsFloatingExpiration, onExpire);

        expirableItems[name] = lCacheItem;
        this.trigger(name + 'added', lCacheItem);
        if (expirationTimespan !== 0) {
            initializeExpirationTimer(lCacheItem);
        }
        return lCacheItem;
    };

    this.getExpirableItem = function (name) {
        var lResult = expirableItems[name];
        if (!isNullOrUndefined(lResult) && lResult.IsFloatingExpiration) {
            window.clearTimeout(lResult.ExpirationTimeoutId);
            initializeExpirationTimer(lResult);
        }
        return lResult;
    };

    this.removeExpirableItem = function (name) {
        var lResult = expirableItems[name];
        if (!isNullOrUndefined(lResult)) {
            window.clearTimeout(lResult.ExpirationTimeoutId);
            expirableItems[name] = null;
        }
        return lResult;
    };

    this.expireItem = function (name) {
        var lCacheItem = this.removeExpirableItem(name);
        if (!isNullOrUndefined(lCacheItem)) {
            lCacheItem.expire();
            lCacheItem.Data = null;
        }
    };

    this.updateItem = function (name) {
        var lCacheItem = updatableItems[name];
        if (!isNullOrUndefined(lCacheItem)) {
            lCacheItem.update();
        }
    };

    this.getUpdatableItems = function () {
        return updatableItems;
    };
}

Cache.prototype = new EventEmitter();
Cache.prototype.constructor = Cache;
