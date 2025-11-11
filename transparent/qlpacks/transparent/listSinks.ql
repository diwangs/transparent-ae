/**
 * @name List DOM sinks inside of a JS database
 * @description A query to list all interesting dataflow sinks inside
 *              React.js source code. This includes DOM sinks like 
 *              element, document, and window mutations, as well as
 *              React-specific sinks like `Fiber.stateNode` mutations 
 *              and callback executions.
 * @id javascript/react-list-sinks
 * @tags security
 */

import javascript

import Common.Utils
import Sinks.DomBasedXssCustomizationsExtended

from 
    DataFlow::Node node, 
    Stmt enclosingStmt, 
    string filepath, 
    int sl, int sc, int el, int ec,
    int ssl, int ssc, int sel, int sec
where (
    isNotInBlacklistedFile(node.asExpr()) and (
        node instanceof DomSinkExtended 
        and node.asExpr().getEnclosingStmt() = enclosingStmt 
        and node.hasLocationInfo(filepath, sl, sc, el, ec) 
        and enclosingStmt.getLocation().hasLocationInfo(_, ssl, ssc, sel, sec)
    )
)
select node, enclosingStmt, filepath, sl, sc, el, ec, ssl, ssc, sel, sec