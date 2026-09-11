import {DurableObject} from 'cloudflare:workers';
import {claimHour} from './hourly-gate.mjs';
export class HourlyCollector extends DurableObject {
  claim(previousCheck = 0) {
    return claimHour(this.ctx.storage.sql, Date.now(), previousCheck);
  }
}
