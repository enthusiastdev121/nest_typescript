import { buffer } from 'rxjs/operators';
import { Readable } from 'stream';

export class StreamableFile {
  private stream: Readable;
  constructor(buffer: Buffer);
  constructor(readble: Readable);
  constructor(bufferOrReadStream: Buffer | Readable) {
    if (Buffer.isBuffer(bufferOrReadStream)) {
      this.stream = new Readable();
      this.stream.push(bufferOrReadStream);
      this.stream.push(null);
    } else if (
      bufferOrReadStream.pipe &&
      typeof bufferOrReadStream.pipe === 'function'
    ) {
      this.stream = bufferOrReadStream;
    }
  }

  getStream() {
    return this.stream;
  }
}
