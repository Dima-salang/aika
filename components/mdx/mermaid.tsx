'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <MermaidContent chart={chart} />;
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let active = true;

    async function renderChart() {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          fontFamily: 'inherit',
          themeCSS: 'margin: 1.5rem auto 0;',
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        });
        
        const { svg: renderedSvg } = await mermaid.render(
          id, 
          chart.replaceAll('\\n', '\n')
        );

        if (active) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        console.error('Failed to render Mermaid chart:', err);
      }
    }

    renderChart();

    return () => {
      active = false;
    };
  }, [id, chart, resolvedTheme]);

  if (!svg) {
    return (
      <div className="animate-pulse h-20 bg-muted/20 rounded flex items-center justify-center text-sm text-muted-foreground border border-dashed border-muted/50 my-6">
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
