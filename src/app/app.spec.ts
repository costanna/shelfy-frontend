import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        // Sin loader real: basta con que el árbol de componentes (Header, Footer...)
        // pueda inyectar TranslateService sin disparar peticiones HTTP de verdad.
        provideTranslateService(),
        // UpdateService necesita poder inyectar SwUpdate; deshabilitado basta
        // para que el propio servicio corte antes de intentar nada real.
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    }).compileComponents();
  });

  it('creates the app shell (header, footer, router outlet) without errors', () => {
    const fixture = TestBed.createComponent(App);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the header with the app brand name', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')).toBeTruthy();
  });
});
