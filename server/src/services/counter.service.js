import { Counter } from '../models/Counter.js';

export const ROLE_PREFIX_MAP = {
  Admin: 'ADM',
  Developer: 'DEV',
  Tester: 'TST',
};

export class CounterService {
  /**
   * Atomically increments the counter for a given prefix and returns the next zero-padded sequence ID.
   * Uses single atomic findOneAndUpdate with $inc and upsert to guarantee race safety.
   *
   * @param {string} prefix - e.g. 'ADM', 'DEV', 'TST'
   * @returns {Promise<string>} e.g. 'DEV-0001'
   */
  async getNextSequence(prefix) {
    if (!prefix || typeof prefix !== 'string') {
      throw new Error('Valid counter prefix is required');
    }

    const cleanPrefix = prefix.trim().toUpperCase();

    const counter = await Counter.findOneAndUpdate(
      { _id: cleanPrefix },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, returnDocument: 'after' }
    );

    const seqNumber = String(counter.seq).padStart(4, '0');
    return `${cleanPrefix}-${seqNumber}`;
  }

  /**
   * Generates a unique, sequential, role-prefixed employee ID.
   *
   * @param {string} role - 'Admin' | 'Developer' | 'Tester'
   * @returns {Promise<string>} e.g. 'ADM-0001', 'DEV-0001', 'TST-0001'
   */
  async generateEmployeeId(role) {
    const prefix = ROLE_PREFIX_MAP[role];
    if (!prefix) {
      throw new Error(`Unsupported role for employee ID generation: "${role}"`);
    }
    return this.getNextSequence(prefix);
  }
}

export const counterService = new CounterService();
export default counterService;
