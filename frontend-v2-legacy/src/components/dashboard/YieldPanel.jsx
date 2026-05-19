export default function YieldPanel({ yieldData }) {
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-6">
      <h3 className="text-white font-semibold mb-4">Your Yield</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Active Strategies</span>
          <span className="text-white font-medium">
            {yieldData?.strategies?.length || 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Est. APR</span>
          <span className="text-gray-500 font-medium">&mdash;</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Total Yield Earned</span>
          <span className="text-yellow-400 font-medium">
            {parseInt(yieldData?.totalYield || '0') > 0
              ? `${yieldData.totalYield} STX`
              : '0 STX'}
          </span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          Yield tracking will be available when yield contracts are live.
          Estimated APY range: 5&ndash;12% depending on pool and strategy.
        </p>
      </div>

      {yieldData?.strategies?.length > 0 && (
        <div className="mt-4 space-y-2">
          {yieldData.strategies.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
              <div>
                <p className="text-sm text-white">{s.name}</p>
                <p className="text-xs text-gray-500">{s.apr} APR</p>
              </div>
              <span className="text-xs text-gray-400">{s.deposited} STX</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
