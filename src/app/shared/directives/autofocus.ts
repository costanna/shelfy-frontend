import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Pone el foco en el elemento en cuanto aparece. Sustituye al atributo autofocus,
 * que el navegador solo respeta una vez por página: un campo que se muestra más
 * tarde (al abrir el buscador o al pulsar «editar») ya no lo recibía.
 */
@Directive({ selector: '[appAutofocus]' })
export class Autofocus {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.element.nativeElement.focus());
  }
}
