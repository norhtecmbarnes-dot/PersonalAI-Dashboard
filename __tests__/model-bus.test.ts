/**
 * Model Message Bus Tests
 * Tests for the hierarchical LLM routing system
 */

import { ModelMessageBus } from '@/lib/services/model-bus';

describe('ModelMessageBus', () => {
  let bus: ModelMessageBus;

  beforeEach(() => {
    bus = new ModelMessageBus();
  });

  test('should initialize with default budget', () => {
    const budget = bus.getBudgetStatus();
    expect(budget.daily).toBe(100000);
    expect(budget.used).toBe(0);
  });

  test('should get available model tiers', () => {
    const tiers = bus.getAvailableModels();
    expect(tiers).toBeDefined();
    expect(tiers.length).toBeGreaterThan(0);
  });

  test('should process simple queries', async () => {
    const result = await bus.process({
      originalQuery: 'What is 2+2?',
      context: '',
      sourceModel: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.finalResponse).toBeDefined();
  });

  test('should track message history', async () => {
    await bus.process({
      originalQuery: 'Test message',
      context: '',
      sourceModel: 'test',
    });

    const history = bus.getHistory(10);
    expect(history.length).toBeGreaterThan(0);
  });

  test('should reset budget', () => {
    bus.resetBudget();
    const budget = bus.getBudgetStatus();
    expect(budget.used).toBe(0);
    expect(budget.localVsCloud.local).toBe(0);
    expect(budget.localVsCloud.cloud).toBe(0);
  });
});
