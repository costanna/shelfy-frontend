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
  protected readonly scanCount = signal(0);
  protected readonly lastCode = signal<string | null>(null);

  private reader: BrowserMultiFormatReader | null = null;
  private controls: IScannerControls | null = null;
  private lastScanAt = 0;
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
      // Sin esto, decodeFromVideoDevice(undefined, ...) deja que el navegador
      // elija la cámara "por defecto", que en la mayoría de móviles es la
      // frontal (la de selfies) — justo la que no sirve para escanear un
      // lomo de libro. facingMode "environment" pide la trasera; "ideal" (no
      // "exact") para no fallar en portátiles que solo tienen webcam frontal.
      // El tamaño ideal más alto ayuda a que el código de barras, que suele
      // ser pequeño, se lea con suficiente detalle para decodificarse.
      const controls = await this.reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        this.video().nativeElement,
        (result) => {
          if (!result || this.destroyed) {
            return;
          }
          // Mode lot: sense aturar la càmera, amb refredament per no emetre
          // el mateix codi diverses vegades mentre l'enfoques.
          const now = Date.now();
          if (now - this.lastScanAt < 1500) {
            return;
          }
          this.lastScanAt = now;
          this.lastCode.set(result.getText());
          this.scanCount.update((count) => count + 1);
          this.scanned.emit(result.getText());
        },
      );

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
