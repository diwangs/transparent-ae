/**
 * This library is a rewrite and extension of `DomBasedXssCustomizations.qll`
 * based on the `DomExtended.qll` library. While the `DomExtended.qll` 
 * library provides a general-purpose set of sinks for DOM-based attacks
 * (e.g. open redirect, cookie read, etc.), this library is specifically
 * focused on DOM-based XSS attacks.
 */

import javascript
import semmle.javascript.security.dataflow.DomBasedXssCustomizations

import DOMExtended

/**
 * LEGACY
 * 
 * HTML or CSS
 * 
 * Added ValueNode so that we could get the location
 */
class DomSinkExtended extends DataFlow::Node {
    DomSinkExtended() {
        // any(DomMethodCallNodeExtended call).interpretsArgumentAsHtml(this) or 
        // any(DomMethodCallNodeExtended call).interpretsArgumentAsUrl(this) or  
        // exists(DomPropertyWriteExtended pw | this = pw.getRhs() |
        //     pw.interpretsValueAsHtml() or 
        //     pw.interpretsValueAsUrl()
        // )
        this instanceof DomFixedSink 
        or this instanceof DomGenericSink
    }
}

/**
 * Fixed sinks
 */
class DomFixedSink extends DataFlow::Node {
    DomFixedSink() {
        exists(DomPropertyWriteExtended pw | this = pw.getRhs() | pw.isFixedSink())
        or any(DomMethodCallNodeExtended call).isFixedSink(this)
    }
}

/**
 * Generic sinks
 */
class DomGenericSink extends DataFlow::Node {
    DomGenericSink() {
        exists(DomPropertyWriteExtended pw | this = pw.getRhs() | pw.isGenericSink(_))
        or any(DomMethodCallNodeExtended call).isGenericSink(this, _)
    }

    predicate propNameDataflowNode(DataFlow::Node propName) {
        exists(DomPropertyWriteExtended pw | this = pw.getRhs() | pw.isGenericSink(propName))
        or any(DomMethodCallNodeExtended call).isGenericSink(this, propName)
    }
}

/**
 * Utility stitches
 * 
 * `for-in` and `for-of` iterator is an implicit DataFlow::SourcePathNode
 * This means, it is a DataFlow::Node without an Expr and AstNode but still has ControlFlowNode
 * However, the only bridge from `DataFlow::Node` to `ControlFlowNode` is `getBasicBlock()`
 * 
 * Heuristic: if the variable name is the same as the iterator, then it's the same node
 * Weakness: if the same name is redefined later, then it'll be inaccurate
 * It's a bad software engineering practice to redefine the same variable name anyway, so it's a fair trade-off
 */
predicate stitchEnhancedForLoop(DataFlow::Node source, DataFlow::Node sink) {
    exists(EnhancedForLoop e | 
        source = e.getIterationDomain().flow()
        
        // In a (const i in x), i is the 2nd CFG node
        and exists(int i | i = 0 or i = 1 | 
            sink.toString() = e.getLValue().getBasicBlock().getNode(i).toString()   
        )
        
    )
}