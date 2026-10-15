import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { exitDemo, isDemoChosen } from '../../../core/demo/demo';

/** Avís "Ets a la demo" a totes les pàgines mentre la demo al navegador està activa, amb la sortida. */
@Component({
  selector: 'app-demo-banner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo-banner.html',
  styleUrl: './demo-banner.scss',
})
export class DemoBanner {
  protected readonly demo = isDemoChosen();

  protected exit(): void {
    exitDemo();
  }
}
