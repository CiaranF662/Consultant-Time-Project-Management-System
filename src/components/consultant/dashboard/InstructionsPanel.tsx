export default function InstructionsPanel() {
  return (
    <div className="mt-12 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-xl font-bold text-blue-900 dark:text-blue-100">How to Use the Weekly Planner</h4>
          <p className="text-blue-600 dark:text-blue-400">Master your weekly resource allocation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-1">Approval Required</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">You can only plan hours for allocations approved by the Growth Team</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-1">Navigate Projects</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click on project headers to collapse/expand phases for better organization</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-indigo-500 dark:bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-1">Plan Your Hours</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enter the number of hours you plan to work each week for each approved phase</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-500 dark:bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">4</span>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-1">Add Descriptions</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">Edit phase descriptions to explain what you plan to accomplish</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">5</span>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-1">Submit for Approval</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click the "Request Approval" button to submit your weekly plan for Growth Team review</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">6</span>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-1">Track Progress</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">The progress bar shows how much of your total phase allocation you've distributed</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-500 dark:bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-1">Need More Hours?</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">You cannot exceed your allocated total - create an Hour Change Request instead</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}