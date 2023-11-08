/// <reference path="_references.js" />

function ReadMultiple(aFullTypeName, aExpression, aVersion, aOnSuccess, aOnFailure, aOutParams, aSortExpression, aRecordCount, aDoCheckState) {
    "use strict";
    var lSortExpression = null,
        lSecurityToken = tryGetSecurityToken(),
        lRecordCount = -1,
        lDoCheckState = true;
    if (!isNullOrUndefined(lSecurityToken)) {

        if (!isNullOrUndefined(aSortExpression)) {
            lSortExpression = aSortExpression;
        }
        if (!isNullOrUndefined(aRecordCount)) {
            lRecordCount = aRecordCount;
        }
        if (!isNullOrUndefined(aDoCheckState)) {
            lDoCheckState = aDoCheckState;
        }

        callAjax('ReadMultiple', {
            'aSecurityToken': lSecurityToken,
            'aSecurityContextId': -1,
            'aTypeName': aFullTypeName,
            'aVersion': aVersion,
            'aWrappedExpression': { 'Expression': aExpression },
            'aSortExpression': lSortExpression,
            'aHowMany': lRecordCount
        }, aOnSuccess, aOnFailure, aOutParams, lDoCheckState);
    }
}

function LogicalOperatorEnum() {
    "use strict";
    this.Undefined = function () { return -1; };
    this.And = function () { return 1; };
    this.Or = function () { return 2; };
}

var mLogicalOperatorEnum = new LogicalOperatorEnum();

function RelationalOperatorEnum() {
    "use strict";

    this.Undefined = function () { return -1; };
    this.Equal = function () { return 1; };
    this.NotEqual = function () { return 2; };
    this.Like = function () { return 3; };
    this.GreaterThan = function () { return 4; };
    this.GreaterThanOrEqual = function () { return 5; };
    this.LessThan = function () { return 6; };
    this.LessThanOrEqual = function () { return 7; };
    this.Is = function () { return 8; };
    this.IsNot = function () { return 9; };
    this.In = function () { return 10; };
    this.NotIn = function () { return 11; };
    this.Contains = function () { return 12; };
}

var mRelationalOperatorEnum = new RelationalOperatorEnum();

function ExpressionBinary(aLeftOperand, aRightOperand, aLogicalOperator) {
    "use strict";

    // this section defined by .net - items must be sent alphabetically
    this.__type = "ExpressionBinary:www.sumosoftware.com/Expressions";
    this.LeftOperand = aLeftOperand;
    this.Operator = aLogicalOperator;
    this.RightOperand = aRightOperand;

    this.Evaluate = function (aObject) {
        var lResult = this.LeftOperand.Evaluate(aObject),
            lRightResult;
        if (this.Operator === mLogicalOperatorEnum.And()) {
            // only evaluate the right if the left is true when logical op is AND
            if (lResult === true && this.RightOperand !== null) {
                lRightResult = this.RightOperand.Evaluate(aObject);
                lResult = lResult && lRightResult;
            }
        } else {
            // only evaluate the right if the left is false when logical op is OR
            if (lResult === false && this.RightOperand !== null) {
                lRightResult = this.RightOperand.Evaluate(aObject);
                lResult = lResult || lRightResult;
            }
        }
        return lResult;
    };
}

function ExpressionConditional(aName, aValue, aIsLiteral, aRelationalOperator) {
    "use strict";

    var lLocalisNullOrUndefined = isNullOrUndefined,
        lFunc = null;
        //lFunctionTable = [];

    // this section defined by .net - items must be sent alphabetically
    this.__type = "ExpressionConditional:www.sumosoftware.com/Expressions";
    this.IsLiteral = false;
    if (!lLocalisNullOrUndefined(aIsLiteral)) {
        this.IsLiteral = aIsLiteral;
    }

    this.Name = aName;
    if (isNullOrUndefined(aRelationalOperator)) {
        aRelationalOperator = mRelationalOperatorEnum.Equal();
    }

    this.Operator = aRelationalOperator;
    this.Value = aValue;

    // evaluation functions
    function EqualFunc(aDatasetValue, aComparison) {
        return aDatasetValue == aComparison;
    }

    function NotEqualFunc(aDatasetValue, aComparison) {
        return aDatasetValue != aComparison;
    }

    function LikeFunc(aDatasetValue, aComparison) {
        // http://stackoverflow.com/questions/5324798/how-to-search-an-array-in-jquery-like-sql-like-value-statement
        
        var lResult = !lLocalisNullOrUndefined(aDatasetValue),
            lDatasetValue,
            lComparison;
        if (lResult === true) {
            lDatasetValue = aDatasetValue.toString().toLowerCase();
            lComparison = aComparison.toString().toLowerCase();
            lResult = lDatasetValue.indexOf(lComparison) !== -1;
        }

        return lResult;
    }

    function GreaterThanFunc(aDatasetValue, aComparison) {
        return !lLocalisNullOrUndefined(aDatasetValue) && aDatasetValue > aComparison;
    }

    function GreaterThanOrEqualFunc(aDatasetValue, aComparison) {
        return !lLocalisNullOrUndefined(aDatasetValue) && aDatasetValue >= aComparison;
    }

    function LessThanFunc(aDatasetValue, aComparison) {
        return !lLocalisNullOrUndefined(aDatasetValue) && aDatasetValue < aComparison;
    }

    function LessThanOrEqualFunc(aDatasetValue, aComparison) {
        return !lLocalisNullOrUndefined(aDatasetValue) && aDatasetValue <= aComparison;
    }

    function IsFunc(aDatasetValue, aComparison) {
        return aDatasetValue === aComparison;
    }

    function IsNotFunc(aDatasetValue, aComparison) {
        return aDatasetValue !== aComparison;
    }

    function InFunc(aDatasetValue, aComparison) {
        return !lLocalisNullOrUndefined(aDatasetValue) && 
            (aComparison.indexOf(aDatasetValue) !== -1 ||
            aComparison.indexOf(aDatasetValue.toString()) !== -1);
    }

    function NotInFunc(aDatasetValue, aComparison) {
        return !lLocalisNullOrUndefined(aDatasetValue) &&
            aComparison.indexOf(aDatasetValue) === -1 &&
            aComparison.indexOf(aDatasetValue.toString()) === -1;
    }

    function ContainsFunc(aDatasetValue, aComparison) {
        return !lLocalisNullOrUndefined(aDatasetValue) &&
            (aDatasetValue.indexOf(aComparison) !== -1 ||
            aDatasetValue.indexOf(aComparison.toString()) !== -1);
    }

    switch (this.Operator) {
        case mRelationalOperatorEnum.Equal(): 
            lFunc = EqualFunc;
            break;
        case mRelationalOperatorEnum.NotEqual(): 
            lFunc = NotEqualFunc;
            break;
        case mRelationalOperatorEnum.Like(): 
            lFunc = LikeFunc;
            break;
        case mRelationalOperatorEnum.GreaterThan(): 
            lFunc = GreaterThanFunc;
            break;
        case mRelationalOperatorEnum.GreaterThanOrEqual(): 
            lFunc = GreaterThanOrEqualFunc;
            break;
        case mRelationalOperatorEnum.LessThan(): 
            lFunc = LessThanFunc;
            break;
        case mRelationalOperatorEnum.LessThanOrEqual(): 
            lFunc = LessThanOrEqualFunc;
            break;
        case mRelationalOperatorEnum.Is(): 
            lFunc = IsFunc;
            break;
        case mRelationalOperatorEnum.IsNot(): 
            lFunc = IsNotFunc;
            break;
        case mRelationalOperatorEnum.In(): 
            lFunc = InFunc;
            break;
        case mRelationalOperatorEnum.NotIn():
            lFunc = NotInFunc;
            break;
        case mRelationalOperatorEnum.Contains():
            lFunc = ContainsFunc;
            break;
        default: 
            throw('invalid operator in expression');
    }

    this.Evaluate = function (aObject) {
        return lFunc(aObject[this.Name], this.Value);
    };
}

function SumoPredicateBuilder() {
    /// <summary>SumoPredicateBuilder provides query predicate construction services. The query predicates are compatible with the server side (vb.net) Sumo ORM library.</summary>
    "use strict";

    this.RootExpression = null;

    this.Clear = function () {
        this.RootExpression = null;
    };

    this.AddConditional = function (aExpressionConditional, aLogicalOperator) {
        /// <summary>SumoPredicateBuilder.AddConditional: add an existing conditional expression to the predicate.</summary>
        /// <param name="aExpressionConditional" type="ExpressionConditional" Optional="false">an existing conditional expression</param>
        /// <param name="aLogicalOperator" type="LogicalOperatorEnum" Optional="true">A logical operator enum in the form mLogicalOperatorEnum.And() or mLogicalOperatorEnum.Or(). If not </param>
        if (this.RootExpression === null) {
            this.RootExpression = aExpressionConditional;
        } else {
            if (typeof aLogicalOperator === 'undefined' || aLogicalOperator === null) {
                aLogicalOperator = mLogicalOperatorEnum.And();
            }
            this.RootExpression = new ExpressionBinary(this.RootExpression, aExpressionConditional, aLogicalOperator);
        }
    };

    this.AddNewExpressionConditional = function (aName, aValue, aIsLiteral, aRelationalOperator, aLogicalOperator) {
        var lNewLeaf,
            lBuilder,
            lSliceCount = 0,
            i,
            lInExpression;
        if (typeof aIsLiteral === 'undefined' || aIsLiteral === null) {
            aIsLiteral = false;
        }
        if (typeof aRelationalOperator === 'undefined' || aRelationalOperator === null || aRelationalOperator === mRelationalOperatorEnum.Undefined()) {
            aRelationalOperator = mRelationalOperatorEnum.Equal();
        }
        if (typeof aLogicalOperator === 'undefined' || aLogicalOperator === null || aLogicalOperator === mLogicalOperatorEnum.Undefined()) {
            aLogicalOperator = mLogicalOperatorEnum.And();
        }
        if (aRelationalOperator === mRelationalOperatorEnum.NotIn() || aRelationalOperator === mRelationalOperatorEnum.In()) {
            if (aValue.length > 1000) {
                lBuilder = new SumoPredicateBuilder();
                lSliceCount = Math.ceil(aValue.length / 1000);
                for (i = 0; i < lSliceCount; i++) {
                    lInExpression = aValue.slice(i * 1000, (i + 1) * 1000);
                    lBuilder.AddNewExpressionConditional(aName, lInExpression, aIsLiteral, aRelationalOperator, mLogicalOperatorEnum.Or());
                }
                this.Concatenate(lBuilder, aLogicalOperator);
            } else {
                lNewLeaf = new ExpressionConditional(aName, aValue, aIsLiteral, aRelationalOperator);
                this.AddConditional(lNewLeaf, aLogicalOperator);
            }
        } else {
            lNewLeaf = new ExpressionConditional(aName, aValue, aIsLiteral, aRelationalOperator);
            this.AddConditional(lNewLeaf, aLogicalOperator);
        }
        //return lNewLeaf;
    };

    this.AddExpressionBinary = function (aExpression, aLogicalOperator) {
        if (typeof aLogicalOperator === 'undefined' || aLogicalOperator === null) {
            aLogicalOperator = mLogicalOperatorEnum.And();
        }
        this.RootExpression = new ExpressionBinary(this.RootExpression, aExpression, aLogicalOperator);
        return this.RootExpression;
    };

    this.Concatenate = function (aSumoPredicateBuilder, aLogicalOperator) {
        if (typeof aLogicalOperator === 'undefined' || aLogicalOperator === null) {
            aLogicalOperator = mLogicalOperatorEnum.And();
        }
        if (this.RootExpression === null) {
            this.RootExpression = aSumoPredicateBuilder.RootExpression;
        } else {
            this.RootExpression = new ExpressionBinary(this.RootExpression, aSumoPredicateBuilder.RootExpression, aLogicalOperator);
        }
    };
}