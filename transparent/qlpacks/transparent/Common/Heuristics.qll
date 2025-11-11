import javascript

predicate heuristicsTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    bindTaintStep(pred, succ)
}

/**
 * Given a function bind, treat it as a regular function call.
 */
predicate bindTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    pred.asExpr().getLocation().getFile().getBaseName() = "ReactFiberWorkLoop.new.ts" and
    exists(Function f, MethodCallExpr m, int i | 
        m.getMethodName() = "bind"
        and pred.asExpr() = m.getArgument(i+1)

        and f.getName() = m.getReceiver().toString()
        and succ.(DataFlow::ParameterNode).getParameter() = f.getParameter(i)
    )
}