import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Autofocus } from './autofocus';

@Component({
  imports: [Autofocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown()) {
      <input appAutofocus />
    }
    <button type="button">other</button>
  `,
})
class Host {
  readonly shown = signal(false);
}

describe('Autofocus', () => {
  it('focuses the element every time it appears, not only the first time', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    const host = fixture.componentInstance;
    const show = async (shown: boolean) => {
      host.shown.set(shown);
      fixture.detectChanges();
      await fixture.whenStable();
    };

    await show(true);
    expect(document.activeElement?.tagName).toBe('INPUT');

    (fixture.nativeElement as HTMLElement).querySelector('button')?.focus();
    await show(false);
    await show(true);
    expect(document.activeElement?.tagName).toBe('INPUT');

    fixture.nativeElement.remove();
  });
});
