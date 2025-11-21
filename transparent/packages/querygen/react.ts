export const REACT_PREFIX = `
  import javascript

  import common.DOMExtended
  import common.PropPropagation

  abstract class ReactSink extends DataFlow::Node {}

  string vulnReactProp() {
    result = "formAction"
    or result = "xlinkHref"
    or result = vulnNativeAttr()
  }
`

/**
 * Generate a CodeQL class that represents React JS-syntax sink based on a list
 * of data object patterns.
 * 
 * @param dataObjectPattern 
 * @returns 
 */
export function generateReactJsSyntax(dataObjectPattern: string[]): string {
  let isFirst = true

  // data object flows to the second argument of the render function
  let wrapper = `
    class ReactJsSyntaxSink extends ReactSink {
      ReactJsSyntaxSink() {
        exists(DataFlow::SourceNode props | 
          ${dataObjectPattern.map(pattern => {
            let result = isFirst ? '' : 'or\n'
            isFirst = false
            // const [propName, payloadType] = pattern.split('.')
            const payloadType = pattern.split('.')[0]
            result += `
              props.flowsTo(react().getAMemberCall("createElement").getArgument(1))
              and props.hasPropertyWrite(${payloadType == '<nativeProp>' ? 'vulnNativeProp()' : 'vulnReactProp()'}, this)
            `
            return result
          }).join('')}
        )
      }
    }
  `

  return wrapper
}

/**
 * Generate a CodeQL class that represents React JSX-syntax sink based on a list
 * of data object patterns.
 * 
 * Inspired from DangerouslySetInnerHTMLSink
 * 
 * @param dataObjectPattern 
 * @returns 
 */
export function generateReactJsxSyntax(dataObjectPattern: string[]): string {
  let isFirst = true

  let wrapper = `
    class ReactHtmlSyntaxSink extends ReactSink, DataFlow::SourceNode {
      ReactHtmlSyntaxSink() {
        exists(DataFlow::Node danger, DataFlow::SourceNode valueSrc |
          ${dataObjectPattern.map(pattern => {
            let result = isFirst ? '' : 'or\n'
            isFirst = false
            // const [propName, payloadType] = pattern.split('-')
            const payloadType = pattern.split('-')[0]
            result += `
              (
                exists(JsxAttribute attr |
                  attr.getName() = ${payloadType == '<nativeProp>' ? 'vulnNativeProp()' : 'vulnReactProp()'} and
                  attr.getValue() = danger.asExpr()
                )
                or
                exists(ReactElementDefinition def, DataFlow::ObjectLiteralNode props |
                  props.flowsTo(def.getProps()) and
                  props.hasPropertyWrite(${payloadType == '<nativeProp>' ? 'vulnNativeProp()' : 'vulnReactProp()'}, danger)
                )
              )
            `
            return result
          }).join('')}
        |
          valueSrc.flowsTo(danger) and
          valueSrc.(DataFlow::Node) = this
        )
      }
    }
  `

  return wrapper
}

/**
 * Generate a CodeQL class that represents React ref sink based on the
 * provided HTML and JS flags.
 * 
 * @param isHTML
 * @param isJS
 * @returns
 */
export function generateReactRef(isHTML: boolean, isJS: boolean): string {
  // Create, attach, and write to ref
  let wrapper = `
    class ReactRefSink extends ReactSink {
      ReactRefSink() {
        exists(DataFlow::SourceNode ref | 
          (
            ref = react().getAMemberCall("useRef")
            or ref = react().getAMemberCall("createRef")
          )


          and (
            ${isHTML ? `
              exists(JsxAttribute refAttr, DataFlow::Node refValue | 
              refAttr.getName() = "ref"
              and refAttr.getValue() = refValue.asExpr()
              and ref.flowsTo(refValue)
            )` : ''}

            ${isHTML && isJS ? 'or' : ''}

            ${isJS ? `
              exists(DataFlow::SourceNode props, DataFlow::Node refValue | 
                props.flowsTo(react().getAMemberCall("createElement").getArgument(1))
                and props.hasPropertyWrite("ref", refValue)
                and ref.flowsTo(refValue)
              )` : ''}
          )
          
          and exists(DataFlow::PropRef refCurrent | 
            isPropagated(ref, refCurrent, "current")
            and isDomSink(refCurrent, this)
          )
        )
      }
    }
  `

  const refRead = `
    class ReactRefReadSink extends Http::ResponseSendArgument, ReactSink {
      Http::Servers::ResponseSource attachment;

      ReactRefReadSink() {
        this.getRouteHandler() = attachment.getRouteHandler()
        and attachment.(DataFlow::CallNode).getCalleeName() = "attachment"
        and attachment.(DataFlow::CallNode).getArgument(0).toString().matches("%.csv%")
      }

      override Http::RouteHandler getRouteHandler() { result = attachment.getRouteHandler() }
    }
  `

  return wrapper + refRead
}