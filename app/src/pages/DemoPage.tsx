export default function DemoPage() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe
        src="https://cinex-milestone-flow.vercel.app"
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        title="CineX Interactive Demo"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}