// read a list from the server by posting the type name, a predicate expression, a sort,
// and a page size. the data service reflects the type, applies the predicate, and returns
// the matching rows. callAjax(method, params, onSuccess, onFailure, outParams) is supplied
// by the host page (the transport), the same way isNullOrUndefined is.
function read(typeName, expression, version, onSuccess, onFailure, outParams, sortExpression, howMany) {
    "use strict";

    var lHowMany = isNullOrUndefined(howMany) ? -1 : howMany,
        lSortExpression = isNullOrUndefined(sortExpression) ? null : sortExpression;

    callAjax('read', {
        'typeName': typeName,
        'version': version,
        'expression': { 'Expression': expression },
        'sortExpression': lSortExpression,
        'howMany': lHowMany
    }, onSuccess, onFailure, outParams);
}
