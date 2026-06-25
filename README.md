# jsexpressions

A small JavaScript library that builds query predicates as an expression tree and runs them against in-memory arrays. The tree is also serializable, so the same predicate a browser builds can be shipped across the wire and executed on the server.

It looks like a throwaway file, and the original README sold it as one ("some really old code… uploading for a friend"). It is the client end of a cross-tier query system that is older and larger than it looks.

## What it is

A small client-side query system in a handful of vanilla-JavaScript files. The core, `predicatebuilder.js`, is a predicate builder over a composite expression tree, in the interpreter pattern:

- `ExpressionConditional` is a leaf — a single comparison like `name == 'gandalf'` or `level >= 20`. It binds one comparison function at construction and applies it in `Evaluate(item)`.
- `ExpressionBinary` is an internal node — two sub-expressions joined by `And` or `Or`, with short-circuit evaluation (it skips the right side when the left already decides the result).
- `PredicateBuilder` assembles the tree. You add conditionals and it grows the root, combining nodes with logical operators.

Evaluating the root against an item walks the tree and returns true or false, so you filter an array by running the predicate over each element.

It supports the comparisons you would expect — `Equal`, `NotEqual`, `Like` (case-insensitive substring), the four inequalities, `Is`/`IsNot` (strict identity), `In`/`NotIn`, and `Contains` — combined with `And` and `Or`. Large `In` lists are split into `Or` groups of a thousand, a workaround for the SQL `IN`-clause limit on the server side.

The other files build on that predicate:

- `query.js` — `query(hash, expression)` and `grep(array, expression)` run a built predicate over a collection.
- `sort.js` — `SortExpression` and `SortColumn` order a result set.
- `eventemitter.js` — a small `bind`/`trigger` base class.
- `cache.js` — a client-side data cache of expirable and self-updating items, built on `EventEmitter`.
- `read.js` — the `read` path that ships a predicate to the server.

## The rest of the story

This was the browser frontend of Sumo, a hand-rolled VB.NET LINQ-to-SQL ORM written in 2007. This JavaScript client came a few years later, in the 2009–10 era. The full pipeline was a distributed query compiler:

```
JavaScript expression tree
        │  serialize over WCF
        ▼
   Sumo expression tree   (VB.NET)
        │  lower
        ▼
   LINQ expression tree
        │  translate
        ▼
        SQL
```

A predicate composed in the browser crossed the WCF boundary, deserialized into a Sumo expression tree, lowered to LINQ, and translated to SQL — then ran against the database. The serialization seam is still visible in the source: each node carries a `__type` tag like `ExpressionConditional:www.sumosoftware.com/Expressions`, and the properties are emitted alphabetically because that is what .NET's `DataContractSerializer` expects on the other side.

For context on the dates: `IQueryable` and LINQ shipped in .NET 3.5 in late 2007, and OData arrived around 2010. This is the same idea — a query composed as a serializable tree, shipped across a boundary, and translated to SQL — built independently and in parallel, for a product that needed it.

## One predicate, three engines

That pipeline is only one of three. The same predicate runs unchanged in three places:

```
browser arrays   ·   compiled parallel in-memory C#   ·   SQL (SQL Server / Oracle / MySQL)
```

A query built in the browser ships as data, then is answered from a database, from server memory, or filtered again in the browser — with a hot cache keeping the client delta-synced to the server. The [wiki](https://github.com/marklauter/jsexpressions/wiki/Cross-Tier-Query) covers the full design, with diagrams.

## Usage

The library expects a global `isNullOrUndefined(x)` helper, provided by the host page.

```javascript
var wizards = [
    { name: 'gandalf',  level: 50 },
    { name: 'radagast', level: 12 },
    { name: 'saruman',  level: 40 }
];

// name LIKE 'gan'  AND  level >= 20
var builder = new PredicateBuilder();
builder.AddConditional(
    new ExpressionConditional('name', 'gan', false, relationalOperators.Like()));
builder.AddConditional(
    new ExpressionConditional('level', 20, false, relationalOperators.GreaterThanOrEqual()),
    logicalOperators.And());

var matches = wizards.filter(function (w) {
    return builder.RootExpression.Evaluate(w);
});
// matches === [ { name: 'gandalf', level: 50 } ]
```

The same `builder.RootExpression`, serialized, is what crossed the wire to Sumo.

## Status

Archival. A handful of vanilla ES5 files, with no build step, no module exports, a dependency on the host's `isNullOrUndefined`, and a host-provided `callAjax` transport for the `read` path. The server it spoke to — `sumosoftware.com` — is gone, so the wire half no longer has anything to answer it. What remains is a tidy example of an expression-tree query system, and the surviving frontend — written around 2009–10 — of a cross-tier query compiler that began in 2007.

MIT licensed.
