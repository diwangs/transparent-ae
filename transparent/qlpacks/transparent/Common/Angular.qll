import javascript

predicate isDataModel(DataFlow::Node d) {
    // Renderer 3 (Ivy) -> theta functions
    exists(Function f | 
        f.getName() = "ɵɵproperty"
        and d.(DataFlow::ParameterNode).getParameter() = f.getAParameter()  
    )
    // Renderer 2 -> `DefaultDomRenderer2
    or exists(ClassDefinition cd, string m | m in ["setAttribute", "setProperty"] |
        cd.getName() = "DefaultDomRenderer2"
        and d.(DataFlow::ParameterNode).getParameter() = cd.getInstanceMethod(m).getAParameter()
    )
}

predicate isInjectionConstructor(DataFlow::Node d) {
    d.asExpr().getEnclosingFunction().getName().matches("injectElementRef")
}

predicate isNativeElement(DataFlow::Node d) {
    exists(TypeAssertion ta | 
        ta.getTypeAnnotation().toString() in ["RElement", "RNode"]
        and d.asExpr() = ta.getExpression()    
    )
}

// ============================================================================
// For debugging purposes
// ============================================================================
predicate manualTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    none()
}