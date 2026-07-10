import { useState, useCallback } from "react";

/**
 * Hook personalizado para evitar el doble envío (double-submit) en botones o formularios.
 * Mantiene un estado de carga y bloquea ejecuciones adicionales si ya hay una petición en curso.
 */
export function useDoubleSubmit<T extends (...args: any[]) => Promise<any>>(
  submitFn: T
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const result = await submitFn(...args);
        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [submitFn, isSubmitting]
  );

  return {
    isSubmitting,
    execute,
  };
}
