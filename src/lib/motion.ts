import { useEffect, useRef, useState } from "react";

/** O usuário pediu menos movimento no sistema? */
export function usePrefersReducedMotion() {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzido(mq.matches);
    const onChange = () => setReduzido(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduzido;
}

/**
 * Começa em 0 e vai para o valor real depois da montagem, para a barra
 * crescer em vez de aparecer preenchida. Com movimento reduzido, vai direto.
 */
export function useGrow(valor: number) {
  const reduzido = usePrefersReducedMotion();
  const [atual, setAtual] = useState(0);
  useEffect(() => {
    if (reduzido) {
      setAtual(valor);
      return;
    }
    const id = requestAnimationFrame(() => setAtual(valor));
    return () => cancelAnimationFrame(id);
  }, [valor, reduzido]);
  return atual;
}

/**
 * Conta de 0 até o valor. Só nos números de destaque — usar em tudo vira ruído.
 */
export function useCountUp(valor: number, duracaoMs = 800) {
  const reduzido = usePrefersReducedMotion();
  const [atual, setAtual] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    if (reduzido || valor === 0) {
      setAtual(valor);
      anterior.current = valor;
      return;
    }
    const de = anterior.current;
    const inicio = performance.now();
    let raf = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / duracaoMs);
      // saída exponencial, casa com --ease-out-expo
      const e = 1 - Math.pow(2, -10 * p);
      setAtual(Math.round(de + (valor - de) * e));
      if (p < 1) raf = requestAnimationFrame(passo);
      else anterior.current = valor;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracaoMs, reduzido]);

  return atual;
}
