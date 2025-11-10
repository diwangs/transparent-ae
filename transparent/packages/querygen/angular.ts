export const ANGULAR_PREFIX = `
  import javascript

  import common.DOMExtended
  import common.PropPropagation

  abstract class AngularSink extends DataFlow::Node {}

  string angularModuleName() {
    result = "@angular/core"
    or result = "angular2/core"
  }

  string decoratorName() {
    result = "Component"
    or result = "Directive"
  }
`

/**
 * Generate a CodeQL class that represents Angular ref sink.
 * 
 * No parameters needed as we only have JS ref mechanism
 * 
 * @returns - the generated CodeQL class as a string
 */
export function generateAngularRef(): string {
  // Get, attach, and write to ref
  const wrapper = `
    class AngularRefSink extends AngularSink {
      AngularRefSink() {
        exists(DataFlow::ClassNode c, DataFlow::ParameterNode refObject | 
          exists(DataFlow::CallNode decorator | 
            decorator = c.getADecorator()
            and decorator = DataFlow::moduleMember(angularModuleName(), decoratorName()).getACall()
          )
          
          and refObject = c.getConstructor().getAParameter()
          and exists(DataFlow::CallNode paramDecorator | 
            paramDecorator = refObject.getADecorator()
            and paramDecorator = DataFlow::moduleMember(angularModuleName(), "Inject").getACall()
            and paramDecorator.getAnArgument() = DataFlow::moduleMember(angularModuleName(), "ElementRef").getALocalUse()
          )

          and exists(DataFlow::PropRef refObjectNativeElement, DataFlow::PropRef refObjectNativeElementVuln | 
            isPropagated(refObject, refObjectNativeElement, "nativeElement")
            and isPropagated(refObjectNativeElement, refObjectNativeElementVuln, vulnNativeProp())
            and isDomSink(refObjectNativeElementVuln.getBase(), this)
          )
        )
      }
    }
  `

  return wrapper
}