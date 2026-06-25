function SortColumn(columnName, direction) {
    "use strict";

    this.ColumnName = columnName;
    this.Direction = direction;
}

function SortExpression() {
    "use strict";

    var self = this;

    this.Columns = [];

    this.addDescendingColumn = function (name) {
        this.Columns.push(new SortColumn(name, "Descending"));
    };

    this.addAscendingColumn = function (name) {
        this.Columns.push(new SortColumn(name, "Ascending"));
    };

    function compare(a, b) {
        var i = 0,
            lColumn = null,
            lResult = 0,
            lColumns = self.Columns;

        for (i = 0; i < lColumns.length; i++) {
            lColumn = lColumns[i];
            if (a[lColumn.ColumnName] > b[lColumn.ColumnName]) {
                lResult = 1;
            } else if (a[lColumn.ColumnName] < b[lColumn.ColumnName]) {
                lResult = -1;
            }
            if (lResult !== 0 && lColumn.Direction === 'Descending') {
                lResult *= -1;
            }
            if (lResult !== 0) {
                break;
            }
        }
        return lResult;
    }

    this.sort = function (list) {
        var lResult = [],
            lKey = null;
        for (lKey in list) {
            if (list.hasOwnProperty(lKey)) {
                lResult.push(list[lKey]);
            }
        }
        lResult.sort(compare);
        return lResult;
    };
}
