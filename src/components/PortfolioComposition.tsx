import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Asset } from '../types';
import AssetSearch from './AssetSearch';

interface PortfolioCompositionProps {
  assets: Asset[];
  onAddAsset: (ticker: string, isin: string | undefined, weight: number) => void;
  onRemoveAsset: (id: string) => void;
  onUpdateWeight: (id: string, weight: number) => void;
}

export default function PortfolioComposition({
  assets,
  onAddAsset,
  onRemoveAsset,
  onUpdateWeight
}: PortfolioCompositionProps) {
  const [weight, setWeight] = useState(10);

  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);
  const isBalanced = Math.abs(totalWeight - 100) < 0.01;

  const handleSelect = (ticker: string, isin?: string) => {
    onAddAsset(ticker, isin, weight);
    setWeight(10);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Portfolio Composition</h2>

      <div className="space-y-3 mb-6">
        <AssetSearch onSelect={handleSelect} />

        <div className="flex gap-2">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            placeholder="Weight %"
            min="0"
            max="100"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        {assets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No assets yet. Search and add assets to build your portfolio.
          </div>
        ) : (
          <>
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{asset.ticker}</div>
                  {asset.isin && (
                    <div className="text-xs text-gray-500 font-mono">{asset.isin}</div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={asset.weight}
                    onChange={(e) => onUpdateWeight(asset.id, Number(e.target.value))}
                    className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-gray-500">%</span>

                  <button
                    onClick={() => onRemoveAsset(asset.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-4">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-orange-600'}`}>
                  {totalWeight.toFixed(1)}%
                </span>
                {!isBalanced && (
                  <span className="text-xs text-orange-600">
                    (should be 100%)
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
