import { useAppStore } from '../../stores/appStore';
import { useUIStore } from '../../stores/uiStore';

export function NodeDetailsPanel() {
  const graph = useAppStore((state) => state.graph);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectNode = useUIStore((state) => state.selectNode);

  if (!graph || !selectedNodeId || !graph.hasNode(selectedNodeId)) {
    return null;
  }

  const attrs = graph.getNodeAttributes(selectedNodeId);
  const { rawData } = attrs;

  return (
    <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 truncate">{attrs.targetName}</h2>
        <button
          onClick={() => selectNode(null)}
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <Section title="Package">
          <code className="text-sm bg-slate-100 px-2 py-1 rounded">
            {attrs.package || '(root)'}
          </code>
        </Section>

        <Section title="Full Label">
          <code className="text-sm bg-slate-100 px-2 py-1 rounded break-all">
            {selectedNodeId}
          </code>
        </Section>

        {attrs.binary && (
          <Section title="Type">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Binary
            </span>
          </Section>
        )}

        {attrs.labels.length > 0 && (
          <Section title="Labels">
            <div className="flex flex-wrap gap-1">
              {attrs.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700"
                >
                  {label}
                </span>
              ))}
            </div>
          </Section>
        )}

        <Section title="Connections">
          <div className="text-sm text-slate-600">
            <p>Dependencies: {attrs.outDegree}</p>
            <p>Dependents: {attrs.inDegree}</p>
          </div>
        </Section>

        {rawData.deps && rawData.deps.length > 0 && (
          <Section title="Dependencies">
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {rawData.deps.map((dep) => (
                <li key={dep} className="text-slate-600 truncate" title={dep}>
                  {dep}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {rawData.outs && rawData.outs.length > 0 && (
          <Section title="Outputs">
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {rawData.outs.map((out) => (
                <li key={out} className="text-slate-600 truncate" title={out}>
                  {out}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {rawData.hash && (
          <Section title="Hash">
            <code className="text-xs text-slate-500 break-all">{rawData.hash}</code>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}
