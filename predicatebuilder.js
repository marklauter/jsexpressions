function LogicalOperatorEnum() {
    "use strict";
    this.Undefined = function () { return -1; };
    this.And = function () { return 1; };
    this.Or = function () { return 2; };
}

var logicalOperators = new LogicalOperatorEnum();

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

var relationalOperators = new RelationalOperatorEnum();

function ExpressionBinary(leftOperand, rightOperand, operator) {
    "use strict";

    // this section defined by .net - items must be sent alphabetically
    this.__type = "ExpressionBinary:www.sumosoftware.com/Expressions";
    this.LeftOperand = leftOperand;
    this.Operator = operator;
    this.RightOperand = rightOperand;

    this.Evaluate = function (item) {
        var lResult = this.LeftOperand.Evaluate(item),
            lRightResult;
        if (this.Operator === logicalOperators.And()) {
            // only evaluate the right if the left is true when logical op is AND
            if (lResult === true && this.RightOperand !== null) {
                lRightResult = this.RightOperand.Evaluate(item);
                lResult = lResult && lRightResult;
            }
        } else {
            // only evaluate the right if the left is false when logical op is OR
            if (lResult === false && this.RightOperand !== null) {
                lRightResult = this.RightOperand.Evaluate(item);
                lResult = lResult || lRightResult;
            }
        }
        return lResult;
    };
}

function ExpressionConditional(name, value, isLiteral, operator) {
    "use strict";

    var lLocalisNullOrUndefined = isNullOrUndefined,
        lFunc = null;
        //lFunctionTable = [];

    // this section defined by .net - items must be sent alphabetically
    this.__type = "ExpressionConditional:www.sumosoftware.com/Expressions";
    this.IsLiteral = false;
    if (!lLocalisNullOrUndefined(isLiteral)) {
        this.IsLiteral = isLiteral;
    }

    this.Name = name;
    if (isNullOrUndefined(operator)) {
        operator = relationalOperators.Equal();
    }

    this.Operator = operator;
    this.Value = value;

    // evaluation functions
    function EqualFunc(actualValue, expectedValue) {
        return actualValue == expectedValue;
    }

    function NotEqualFunc(actualValue, expectedValue) {
        return actualValue != expectedValue;
    }

    function LikeFunc(actualValue, expectedValue) {
        // http://stackoverflow.com/questions/5324798/how-to-search-an-array-in-jquery-like-sql-like-value-statement
        
        var lResult = !lLocalisNullOrUndefined(actualValue),
            lDatasetValue,
            lComparison;
        if (lResult === true) {
            lDatasetValue = actualValue.toString().toLowerCase();
            lComparison = expectedValue.toString().toLowerCase();
            lResult = lDatasetValue.indexOf(lComparison) !== -1;
        }

        return lResult;
    }

    function GreaterThanFunc(actualValue, expectedValue) {
        return !lLocalisNullOrUndefined(actualValue) && actualValue > expectedValue;
    }

    function GreaterThanOrEqualFunc(actualValue, expectedValue) {
        return !lLocalisNullOrUndefined(actualValue) && actualValue >= expectedValue;
    }

    function LessThanFunc(actualValue, expectedValue) {
        return !lLocalisNullOrUndefined(actualValue) && actualValue < expectedValue;
    }

    function LessThanOrEqualFunc(actualValue, expectedValue) {
        return !lLocalisNullOrUndefined(actualValue) && actualValue <= expectedValue;
    }

    function IsFunc(actualValue, expectedValue) {
        return actualValue === expectedValue;
    }

    function IsNotFunc(actualValue, expectedValue) {
        return actualValue !== expectedValue;
    }

    function InFunc(actualValue, expectedValue) {
        return !lLocalisNullOrUndefined(actualValue) && 
            (expectedValue.indexOf(actualValue) !== -1 ||
            expectedValue.indexOf(actualValue.toString()) !== -1);
    }

    function NotInFunc(actualValue, expectedValue) {
        return !lLocalisNullOrUndefined(actualValue) &&
            expectedValue.indexOf(actualValue) === -1 &&
            expectedValue.indexOf(actualValue.toString()) === -1;
    }

    function ContainsFunc(actualValue, expectedValue) {
        return !lLocalisNullOrUndefined(actualValue) &&
            (actualValue.indexOf(expectedValue) !== -1 ||
            actualValue.indexOf(expectedValue.toString()) !== -1);
    }

    switch (this.Operator) {
        case relationalOperators.Equal(): 
            lFunc = EqualFunc;
            break;
        case relationalOperators.NotEqual(): 
            lFunc = NotEqualFunc;
            break;
        case relationalOperators.Like(): 
            lFunc = LikeFunc;
            break;
        case relationalOperators.GreaterThan(): 
            lFunc = GreaterThanFunc;
            break;
        case relationalOperators.GreaterThanOrEqual(): 
            lFunc = GreaterThanOrEqualFunc;
            break;
        case relationalOperators.LessThan(): 
            lFunc = LessThanFunc;
            break;
        case relationalOperators.LessThanOrEqual(): 
            lFunc = LessThanOrEqualFunc;
            break;
        case relationalOperators.Is(): 
            lFunc = IsFunc;
            break;
        case relationalOperators.IsNot(): 
            lFunc = IsNotFunc;
            break;
        case relationalOperators.In(): 
            lFunc = InFunc;
            break;
        case relationalOperators.NotIn():
            lFunc = NotInFunc;
            break;
        case relationalOperators.Contains():
            lFunc = ContainsFunc;
            break;
        default: 
            throw('invalid operator in expression');
    }

    this.Evaluate = function (item) {
        return lFunc(item[this.Name], this.Value);
    };
}

function PredicateBuilder() {
    /// <summary>PredicateBuilder provides query predicate construction services. The query predicates are compatible with the server side (vb.net) Sumo ORM library.</summary>
    "use strict";

    this.RootExpression = null;

    this.Clear = function () {
        this.RootExpression = null;
    };

    this.AddConditional = function (expressionConditional, operator) {
        /// <summary>PredicateBuilder.AddConditional: add an existing conditional expression to the predicate.</summary>
        /// <param name="expressionConditional" type="ExpressionConditional" Optional="false">an existing conditional expression</param>
        /// <param name="operator" type="LogicalOperatorEnum" Optional="true">A logical operator enum in the form logicalOperators.And() or logicalOperators.Or(). If not </param>
        if (this.RootExpression === null) {
            this.RootExpression = expressionConditional;
        } else {
            if (typeof operator === 'undefined' || operator === null) {
                operator = logicalOperators.And();
            }
            this.RootExpression = new ExpressionBinary(this.RootExpression, expressionConditional, operator);
        }
    };

    this.AddNewExpressionConditional = function (name, value, isLiteral, operator, operator) {
        var lNewLeaf,
            lBuilder,
            lSliceCount = 0,
            i,
            lInExpression;
        if (typeof isLiteral === 'undefined' || isLiteral === null) {
            isLiteral = false;
        }
        if (typeof operator === 'undefined' || operator === null || operator === relationalOperators.Undefined()) {
            operator = relationalOperators.Equal();
        }
        if (typeof operator === 'undefined' || operator === null || operator === logicalOperators.Undefined()) {
            operator = logicalOperators.And();
        }
        if (operator === relationalOperators.NotIn() || operator === relationalOperators.In()) {
            if (value.length > 1000) {
                lBuilder = new PredicateBuilder();
                lSliceCount = Math.ceil(value.length / 1000);
                for (i = 0; i < lSliceCount; i++) {
                    lInExpression = value.slice(i * 1000, (i + 1) * 1000);
                    lBuilder.AddNewExpressionConditional(name, lInExpression, isLiteral, operator, logicalOperators.Or());
                }
                this.Concatenate(lBuilder, operator);
            } else {
                lNewLeaf = new ExpressionConditional(name, value, isLiteral, operator);
                this.AddConditional(lNewLeaf, operator);
            }
        } else {
            lNewLeaf = new ExpressionConditional(name, value, isLiteral, operator);
            this.AddConditional(lNewLeaf, operator);
        }
        //return lNewLeaf;
    };

    this.AddExpressionBinary = function (expression, operator) {
        if (typeof operator === 'undefined' || operator === null) {
            operator = logicalOperators.And();
        }
        this.RootExpression = new ExpressionBinary(this.RootExpression, expression, operator);
        return this.RootExpression;
    };

    this.Concatenate = function (predicateBuilder, operator) {
        if (typeof operator === 'undefined' || operator === null) {
            operator = logicalOperators.And();
        }
        if (this.RootExpression === null) {
            this.RootExpression = predicateBuilder.RootExpression;
        } else {
            this.RootExpression = new ExpressionBinary(this.RootExpression, predicateBuilder.RootExpression, operator);
        }
    };
}
