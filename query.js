function query(hash, expression) {
    "use strict";

    var lResult,
        lKey,
        lItem;
    if (!isNullOrUndefined(hash) && !isNullOrUndefined(expression)) {
        lResult = [];
        for (lKey in hash) {
            if (hash.hasOwnProperty(lKey)) {
                lItem = hash[lKey];
                if (expression.Evaluate(lItem)) {
                    lResult[lKey] = lItem;
                }
            }
        }
    } else {
        lResult = hash;
    }
    return lResult;
}

function grep(array, expression) {
    "use strict";

    // works with arrays, not with hashes
    return $.grep(array, expression.Evaluate);
}
