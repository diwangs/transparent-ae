import javascript

/**
 * Predicate to identify Vue's data model node
 * 
 * `src/core/instance/lifecycle.ts/lifecycleMixin/_update`
 */
predicate isDataModel(DataFlow::Node d) {
    d.asExpr().getLocation().getFile().getBaseName() = "lifecycle.ts"
    // and d.(DataFlow::ParameterNode).getName() = "vnode"
}

/**
 * Vue exportable: `createElement`'s 2nd argument 
 * 
 * This is the function that will be injected to the `render` options in 
 * `Vue`'s Global API.
 */
predicate vueExportable(DataFlow::Node d) {
    d.asExpr().getLocation().getFile().getBaseName() = "create-element.ts"
    and exists(Function f | f.getName() = "createElement" |
        // Technically 3rd argument because it will be wrapped
        f.getParameter(2).flow() = d 
    )
}

/**
 * Predicate for a field assignment ExprNode in ES2015 classes constructor
 * 
 * Object that is instantiated with a `new` keyword has a constructor that will
 * assign its `this` object instead of returning a value, and we have a need 
 * to detect them.
 * 
 * e.g., for Vue's `VNode` and React's Virtual DOM
 * Check if a node is a `this.x = x` in the `VNode` constructor
 */
predicate isCtorFieldAssignment(DataFlow::ExprNode d) {
    exists(Constructor c, ThisExpr t, PropAccess p | p.getBase() = t and t.getBinder() = c | 
        d.asExpr().(Assignment).getLhs() = p
    )
}

// ============================================================================
// For debugging purposes
// ============================================================================
predicate vueSink(DataFlow::Node d) {
    d.asExpr().getLocation().getFile().getBaseName() = "dom-props.ts"
    and d.asExpr().toString() = "cur"
    and exists(TryStmt t | 
        d.asExpr().getEnclosingStmt().getEnclosingTryCatchStmt() = t
    )
}

predicate manualTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    none()
}