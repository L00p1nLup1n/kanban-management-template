import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  ProjectError,
  TaskError,
} from '../../errors/error.js';

const ERROR_CLASSES = [
  { name: 'ValidationError', Cls: ValidationError },
  { name: 'ProjectError', Cls: ProjectError },
  { name: 'TaskError', Cls: TaskError },
];

ERROR_CLASSES.forEach(({ name, Cls }) => {
  describe(name, () => {
    it('sets statusCode property', () => {
      const err = new Cls(404, 'not found');
      expect(err.statusCode).toBe(404);
    });

    it('sets message property', () => {
      const err = new Cls(400, 'bad request');
      expect(err.message).toBe('bad request');
    });

    it('is an instance of Error', () => {
      expect(new Cls(500, 'server error')).toBeInstanceOf(Error);
    });

    it('is an instance of itself', () => {
      expect(new Cls(200, 'ok')).toBeInstanceOf(Cls);
    });
  });
});
