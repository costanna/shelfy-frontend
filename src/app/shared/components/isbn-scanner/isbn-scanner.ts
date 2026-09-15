import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

type ScannerError = 'denied' | 'unsupported';

/**
 * Overlay a pantalla completa que abre la cámara y decodifica códigos de
 * barras EAN-13 (el formato de los ISBN) con ZXing. Emite el texto
 * decodificado una sola vez y deja de escanear.
 */
@Component({
  selector: 'app-isbn-scanner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './isbn-scanner.html',
  styleUrl: './isbn-scanner.scss',
})
export class IsbnScanner implements AfterViewInit, OnDestroy {
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  readonly scanned = output<string>();
  readonly closed = output<void>();

  protected readonly error = signal<ScannerError | null>(null);

  private reader: BrowserMultiFormatReader | null = null;
  private controls: IScannerControls | null = null;
  private hasScanned = false;
  private destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('unsupported');
      return;
    }

    const hints = new Map<DecodeHintType, unknown>([
      [
        DecodeHintType.POSSIBLE_FORMATS,
        [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A],
      ],
    ]);
    this.reader = new BrowserMultiFormatReader(hints);

    try {
      const controls = await this.reader.decodeFromVideoDevice(
        undefined,
        this.video().nativeElement,
        (result) => {
          if (result && !this.hasScanned) {
            this.hasScanned = true;
            this.controls?.stop();
            this.scanned.emit(result.getText());
          }
        },
      );

      // El componente puede haberse destruido (p. ej. el usuario cierra el
      // escáner) mientras esta promesa seguía pendiente. ngOnDestroy ya no
      // puede pararla porque `controls` todavía era null en ese momento, así
      // que la cámara se quedaría encendida de fondo si no se para aquí.
      if (this.destroyed) {
        controls.stop();
        return;
      }
      this.controls = controls;
    } catch {
      if (!this.destroyed) {
        this.error.set('denied');
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.controls?.stop();
  }

  protected close(): void {
    this.closed.emit();
  }
}
