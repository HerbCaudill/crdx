import { ValidationResult } from '/validator'

// ignore coverage
expect.extend({
  async toBeValid(_validation: Promise<ValidationResult>) {
    const validation = await _validation
    if (validation.isValid)
      return {
        message: () => 'expected validation not to pass',
        pass: true,
      }
    else
      return {
        message: () => validation.error.message,
        pass: false,
      }
  },
})
