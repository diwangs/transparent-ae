import javascript 

predicate isDataModel(DataFlow::Node d) {
    // React has many render functions, but all of them rely on 
    // `updateContainer` from 
    // `react-reconciler/src/ReactFiberReconciler.{old|new}.ts`
    exists(Function f | 
        f.getName() = "updateContainer"
        and d.(DataFlow::ParameterNode).getParameter() = f.getParameter(0)  
    )
}

// ============================================================================
// For debugging purposes
// ============================================================================
predicate reactPerformUnitOfWork(DataFlow::Node d) {
    exists(Function f | 
        f.getName() = "performUnitOfWork"
        and d.(DataFlow::ParameterNode).getParameter() = f.getParameter(0)  
    )
}

predicate reactCompleteUnitOfWork(DataFlow::Node d) {
    exists(DataFlow::InvokeNode i | 
        i.getCalleeName() = "completeUnitOfWork"
        and i.getAnArgument() = d
    ) 
    and d.asExpr().getEnclosingFunction().getName() = "performUnitOfWork"
}

predicate reactInnerHTML(DataFlow::Node d) {
    exists(Assignment e | 
        e.getLhs().(DotExpr).getPropertyName() = "innerHTML"
        and e.getLhs().(DotExpr).getBase().toString() = "node"
        and e.getRhs() = d.asExpr()
        and e.getRhs().toString().matches("%html as any%")
    )
}

// Flaws of CodeQL requiring manual stitches
predicate manualTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    // Specific manual stitches, for debugging
    onlyPropTaintStep(pred, succ)               // Could be generic
    or workInProgressTaintStep(pred, succ)      // React-specific
    or hostConfigTaintStep(pred, succ)          // covered by autostitch
    or wrapperFunctionTaintStep(pred, succ)     // covered by autostitch
}

/**
 * In `updateContainer` (`react-reconciler/src/ReactFiberReconciler.{old|new}.ts`)
 * we do `root = enqueueUpdate()` before `scheduleUpdateOnFiber(root)`, but 
 * `enqueueUpdate` is only tainted by `container` rather than `element` (which
 * contains the data model).
 * 
 * This is likely due to `update.payload = { element }` expression, but for now
 * this is a crude fix.
 *
 * __Generic fix__: This is a flaw of CodeQL. If something is an only property,
 * then taint the parent.
 */
predicate onlyPropTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    exists(Assignment a, ObjectExpr o | 
        // Pred
        o = a.getRhs()
        and o.getPropertyByName("element").getInit() = pred.asExpr()

        // Succ
        // and a.getLhs().(PropAccess).getBase() = succ.asExpr()
    )

    and

    exists(DataFlow::InvokeNode i | 
        // Pred
        // pred = i.getArgument(1)
        
        // Succ
        succ = i
        
        and i.getCalleeName().matches("%enqueueUpdate%")        
    )

    and 
    pred.asExpr().getEnclosingFunction() = succ.asExpr().getEnclosingFunction()
}

/**
 * __Missing Call Edge__:
 * `renderRoot{Sync|Concurrent}` -> `workLoop{Sync|Concurrent}`
 * at `react-reconciler/src/ReactFiberWorkLoop.{new|old}.ts`
 * __Cause__: Untracked global variable
 * 
 * __Description__:
 * `performUnitOfWork(Fiber)`
 * at `workLoop{S|C}()` 
 * at `renderRoot{S|C}(FiberRoot, Lanes)` 
 * 
 * `prepareFreshStack(FiberRoot, Lanes): Fiber` is called before 
 * `workLoop{S|C}()` and assign globals `workInProgress`
 * and `performUnitOfWork(Fiber)` uses `workInProgress` as arg.
 * 
 * __Correct fix__:
 * `prepareFreshStack(FiberRoot, Lanes)` 
 * to `workInProgress` arg of `performUnitOfWork`
 * 
 * __Generic fix__ (skipping algorithm):
 * `FiberRoot` and `Lanes` param of `renderRoot{S|C}`
 * to `workInProgress` arg of `performUnitOfWork`
 */
predicate workInProgressTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    (exists(Function f | f.getName().matches("renderRootSync") | 
        pred.asExpr() = f.getParameter(0)
        and succ.asExpr().getEnclosingFunction().getName() = "workLoopSync"
    )
    or exists(Function f | f.getName().matches("renderRootConcurrent") | 
        pred.asExpr() = f.getParameter(0)
        and succ.asExpr().getEnclosingFunction().getName() = "workLoopConcurrent"
    ))
    and succ.asExpr().(Identifier).getName() = "workInProgress" and
    exists(CallExpr call | 
        call.getCalleeName() = "performUnitOfWork" and
        call.getArgument(0) = succ.asExpr()
    )
}

/**
 * __Missing Call Edge__: `finalizeInitialChildren` call from `completeWork` to HostConfig
 */
predicate hostConfigTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    exists(DataFlow::InvokeNode c, Function f, int i | 
        // Pred
        pred = c.getArgument(i)
        
        // Succ
        and succ.asExpr() = f.getParameter(i)
        
        and f.getName() = c.getCalleeName()
        and f.getName().matches("%finalizeInitialChildren%")
    )
}

/**
 * __Missing Call Edge__: `setInnerHTML` call
 */
predicate wrapperFunctionTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
    exists(DataFlow::InvokeNode c, DeclStmt d, Function f, int i | 
        // Pred
        pred = c.getArgument(i)
        
        // Succ
        and d.getADecl().getInit().(InvokeExpr).getNumArgument() = 1
        and f = d.getADecl().getInit().(InvokeExpr).getArgument(0)
        and succ.asExpr() = f.getParameter(i)
        
        // Name of pred and succ is the same
        and d.getADecl().getBindingPattern().getName() = c.getCalleeName()

        // Get rid of this
        and d.getADecl().getInit().(InvokeExpr).getCalleeName().matches("%createMicrosoftUnsafe%")
    )
}