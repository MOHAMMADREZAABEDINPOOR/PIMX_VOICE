// The AudioContext resamples the tab stream to 16 kHz; transfer one 100 ms mono frame.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.frame = new Float32Array(1600); this.offset = 0; }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let value = 0;
      for (const channel of channels) value += channel[i] / channels.length;
      this.frame[this.offset++] = value;
      if (this.offset === this.frame.length) {
        this.port.postMessage(this.frame.buffer, [this.frame.buffer]);
        this.frame = new Float32Array(1600); this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('luma-pcm', PCMProcessor);
