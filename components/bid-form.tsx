'use client';

import { useState } from 'react';
import { submitBid, VendorJob } from '@/lib/vendor-queries';
import { useAuthContext } from '@/lib/auth-context';
import { DollarSign, Clock, FileText, Send, Check } from 'lucide-react';

interface BidFormProps {
  job: VendorJob;
  onClose: () => void;
  onSubmitted: () => void;
}

export function BidForm({ job, onClose, onSubmitted }: BidFormProps) {
  const { orgId } = useAuthContext();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [scope, setScope] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const platformFee = amount ? Math.round(parseFloat(amount) * 0.10) : 0;
  const budgetNum = job.vendor_budget || 0;
  const amountNum = parseFloat(amount) || 0;
  const overBudget = amountNum > budgetNum * 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !duration || !orgId) return;
    setSubmitting(true);

    await submitBid({
      request_id: job.id,
      vendor_org_id: orgId,
      bid_amount: parseFloat(amount),
      estimated_duration: duration,
      scope_description: scope,
    });

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(onSubmitted, 1500);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative bg-[#FDFCFA] rounded-2xl shadow-xl p-8 text-center max-w-sm mx-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-sos-blue-800">Bid Submitted</h3>
          <p className="text-sm text-sos-gray-600 mt-2">Your bid of ${amount} has been submitted for review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full md:w-[440px] bg-[#FDFCFA] rounded-t-2xl md:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-sos-blue-800 px-5 py-4 rounded-t-2xl md:rounded-t-xl">
          <h3 className="text-base font-bold text-white">Submit Bid</h3>
          <p className="text-xs text-sos-accent-400 mt-0.5">{job.details_sanitized}</p>
        </div>

        {/* Job Summary */}
        <div className="px-5 py-3 border-b border-sos-gray-300 bg-sos-gray-200/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sos-gray-600">Budget</span>
            <span className="text-sm font-bold text-sos-blue-800">
              {budgetNum > 0 ? `$${budgetNum.toLocaleString()}` : 'TBD'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Bid Amount */}
          <div>
            <label className="text-xs font-semibold text-sos-gray-600 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Bid Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sos-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white border-2 border-sos-gray-300 text-base text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
              />
            </div>
            {overBudget && (
              <div className="mt-2 p-2.5 rounded-lg bg-sos-red-50 border border-sos-red-200">
                <p className="text-xs font-bold text-sos-red-700">🚨 Gouging Alert</p>
                <p className="text-[10px] text-sos-red-600 mt-0.5">This bid exceeds 2× the estimated budget. It will be flagged for review and may be rejected.</p>
              </div>
            )}
            {platformFee > 0 && (
              <p className="text-[10px] text-sos-gray-500 mt-1">Platform fee (10%): ${platformFee.toLocaleString()}</p>
            )}
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="text-xs font-semibold text-sos-gray-600 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5" /> Estimated Duration
            </label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-sos-gray-300 text-base text-sos-blue-800 focus:outline-none focus:border-sos-accent-400"
            >
              <option value="">Select duration</option>
              <option value="same_day">Same day</option>
              <option value="1-2 days">1-2 days</option>
              <option value="3-5 days">3-5 days</option>
              <option value="1 week">1 week</option>
              <option value="2 weeks">2 weeks</option>
              <option value="1 month">1 month</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Scope Description */}
          <div>
            <label className="text-xs font-semibold text-sos-gray-600 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5" /> Scope of Work
            </label>
            <textarea
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="Describe what's included in your bid..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-sos-gray-300 text-base text-sos-blue-800 focus:outline-none focus:border-sos-accent-400 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!amount || !duration || submitting}
            className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-sos-red-600 disabled:opacity-40 transition-colors"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Bid {amount && `· $${parseFloat(amount).toLocaleString()}`}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sos-gray-600 text-sm font-medium hover:bg-sos-gray-200 transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
