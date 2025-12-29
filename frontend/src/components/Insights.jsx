import React from 'react';

const Insights = ({ metrics = {} }) => {
  const insights = [
    {
      label: 'Number of meetings you hosted this week',
      value: metrics.meetingsHostedThisWeek || 0,
    },
    {
      label: 'Total meetings this week',
      value: metrics.totalMeetingsThisWeek || 0,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Insights</h3>
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index}>
            <p className="text-sm text-gray-600 mb-1">{insight.label}</p>
            <p className="text-2xl font-bold text-purple-600">{insight.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Insights;

