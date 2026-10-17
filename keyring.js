// No key values are exposed in public metadata or errors.
export class KeyRing {
  constructor(entries) { this.entries = entries.filter(e=>e?.id && e?.value); this.index = 0; this.exhausted = new Set(); }
  get current() { return this.entries[this.index]; }
  rotate(failedId = this.current?.id) {
    if (failedId) this.exhausted.add(failedId);
    if (this.current && !this.exhausted.has(this.current.id)) return this.current;
    for (let step=1;step<=this.entries.length;step++) {
      const index=(this.index+step)%this.entries.length;
      if (!this.exhausted.has(this.entries[index].id)) { this.index=index; return this.current; }
    }
    throw new Error('KEYS_EXHAUSTED');
  }
}
export function keyMetadata(entries) { return entries.map(({id,name,value,remember})=>({id,name,suffix:value.slice(-4),remember:!!remember})); }
export function retryableKeyError(error) { return /429|RESOURCE_EXHAUSTED|quota|401|403|API[ _-]?KEY|PERMISSION_DENIED/i.test(String(error?.message || error)); }
