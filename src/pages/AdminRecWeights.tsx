import { RecVibeWeightsEditor } from '@/components/admin/RecVibeWeightsEditor';

export default function AdminRecWeights() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="px-4 py-3 border-b">
        <h1 className="text-xl font-semibold">Admin · Recommendation Vibe Weights</h1>
        <p className="text-sm text-gray-500">Edit weights per vibe used by the recommender. Changes take effect immediately.</p>
      </div>
      <RecVibeWeightsEditor />
    </div>
  );
}