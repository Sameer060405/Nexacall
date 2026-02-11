import React from 'react';

const Insights = ({ metrics = {} }) => {
  const insights = [
    {
      label: 'Meetings you hosted this week',
      value: metrics.meetingsHostedThisWeek || 0,
    },
    {
      label: 'Total meetings this week',
      value: metrics.totalMeetingsThisWeek || 0,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-[#e2e8f0] p-4">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">Insights</h3>
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index}>
            <p className="text-sm text-[#5e6c84] mb-1">{insight.label}</p>
            <p className="text-xl font-semibold text-[#0B5CFF]">{insight.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Insights;
