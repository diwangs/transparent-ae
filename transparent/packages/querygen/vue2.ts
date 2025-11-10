export const VUE2_PREFIX = `
import javascript 
import common.PropPropagation
import common.DOMExtended

abstract class Vue2Sink extends DataFlow::Node {}

`

/**
 * Generate a CodeQL class that represents Vue JS-syntax sink based on a single
 * data object pattern.
 * 
 * The shape of the query will be shaped like the `VueCreateElementSink` class 
 * that is defined in the CodeQL standard library.
 * 
 * @param dataObjectPattern - the data object pattern (e.g., "attrs.<nativeAttr>")
 * @returns - the generated CodeQL class as a string
 */
export function generateVue2JsSyntax(dataObjectPattern: string[]): string {
  let isFirst = true
  
  // data object flows to the second argument of the render function
  let wrapper = `
    class Vue2JsSyntaxSink extends Vue2Sink {
      Vue2JsSyntaxSink() {
        exists(Vue::Component c, DataFlow::FunctionNode renderFunc, DataFlow::SourceNode data |
          (
            renderFunc.flowsTo(c.getRender())
            or renderFunc.getName() = "render"
          ) 
          and data.flowsTo(renderFunc.getParameter(0).getACall().getArgument(1))

          and (
            ${dataObjectPattern.map(pattern => {
              let result = isFirst ? '' : 'or\n'
              isFirst = false
              const [propName, payloadType] = pattern.split('.')
              result += `
                exists(DataFlow::PropRef dataDomProps, DataFlow::PropWrite dataDomPropsPW | 
                  isPropagated(data, dataDomProps, "${propName}")
                  and isPropagated(dataDomProps, dataDomPropsPW, ${payloadType == '<nativeProp>' ? 'vulnNativeProp()' : 'vulnNativeAttr()'})
                  
                  and dataDomPropsPW.getRhs() = this
                )
                `
              return result
            }).join('')}
          )
        )    
      }
    }
    `

  return wrapper
}

/**
 * Generate a CodeQL class that represents Vue JSX-syntax sink based on data
 * object patterns.
 * 
 * We reuse the `JsxAttribute` class from the CodeQL standard library to
 * represent the sink efficiently.
 * 
 * @param dataObjectPattern 
 * @returns 
 */
export function generateVue2JsxSyntax(dataObjectPattern: string[]): string {
  let isFirst = true 

  // Define using `JsxAttribute` from CodeQL standard library
  let wrapper = `
    class Vue2HtmlSyntaxSink extends Vue2Sink {
      Vue2HtmlSyntaxSink() {
        exists(JsxAttribute attr | 
          (
            ${dataObjectPattern.map(pattern => {
              let result = isFirst ? '' : 'or\n'
              isFirst = false
              const [propName, payloadType] = pattern.split('-')
              result += `
                (
                  attr.getName().prefix(${propName.length}) = "${propName}"
                  and attr.getName().suffix(${payloadType == '<nativeProp>' ? 'vulnNativeProp().length()' : 'vulnNativeAttr().length()'}).toLowerCase() = ${payloadType == '<nativeProp>' ? 'vulnNativeProp()' : 'vulnNativeAttr()'}.toLowerCase()
                )
                `
              return result
            }).join('')}
          )
          and attr.getValue() = this.asExpr()
        )
      }
    }
    `

  return wrapper
}

/**
 * Generate a CodeQL class that represents Vue 2 ref mechanism.
 * 
 * @param isHTML - is ref defined in HTML syntax
 * @param isJS - is ref defined in JS syntax
 * @returns - the generated CodeQL class as a string
 */
export function generateVue2Ref(isHTML: boolean, isJS: boolean): string {
  // First is SFC + JSX syntax
  // Second is JS syntax
  
  let refName = `
  string getVue2RefName() {
    ${isHTML ? `
    exists(HTML::Attribute refAttr | 
      refAttr.getName() = "ref"
      and result = refAttr.getValue()
    )
    ` : ''}

    ${isHTML && isJS ? 'or' : ''}

    ${isJS ? `
    exists(Vue::Component c, DataFlow::FunctionNode renderFunc, DataFlow::SourceNode data |
      renderFunc.flowsTo(c.getRender()) 
      and data.flowsTo(renderFunc.getParameter(0).getACall().getArgument(1))

      and exists(DataFlow::PropWrite dataRef | 
        isPropagated(data, dataRef, "ref")
        
        and dataRef.getRhs().getStringValue() = result
      )
    )
    ` : ''}
  }
  `

  // classes for ref sink and ref read themselves (based on the generated function above)
  const classes = `
  class Vue2RefSink extends Vue2Sink {
    string refName;
    
    Vue2RefSink() {
      refName = getVue2RefName()

      and exists(Vue::Component c, DataFlow::ThisNode vm, DataFlow::SourceNode refNode | 
        vm = c.getABoundFunction().getAFunctionValue().getReceiver()
        and refNode = vm.getAPropertyRead("$refs")

        and exists(DataFlow::PropRef refNodeName | 
          isPropagated(refNode, refNodeName, refName)
          and isDomSink(refNodeName, this)
        )
      )
    }
  }

  class Vue2RefRead extends Vue2Sink {
    string refName;

    Vue2RefRead() {
      refName = getVue2RefName()

      and exists(DataFlow::Node refNodeName | 
        exists(Vue::Component c, DataFlow::ThisNode vm, DataFlow::SourceNode refNode | 
          vm = c.getABoundFunction().getAFunctionValue().getReceiver()
          and refNode = vm.getAPropertyRead("$refs")
          and refNodeName = refNode.getAPropertyRead(refName)
        )

        and exists(DomMethodCallNodeExtended mc | 
          mc.interpretsArgumentAsUrl(this)
          and getACaller*(this.asExpr().getEnclosingFunction()) = getACaller*(refNodeName.asExpr().getEnclosingFunction())
        )
      )
    }
  }
  `

  return refName + classes
}