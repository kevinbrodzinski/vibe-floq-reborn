export const TimeModuleIndicators = () => {
  return (
    <div className="absolute top-40 left-6 right-6 z-10">
      {/* Dawn Module */}
      <div className="time-module-dawn mb-2">
        <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
          <span className="text-xs text-primary font-medium">🌅 Gentle awakening — set your flow</span>
        </div>
      </div>
      
      {/* Morning Module */}
      <div className="time-module-morning mb-2">
        <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
          <span className="text-xs text-primary font-medium">☀️ Energy rising — connect & create</span>
        </div>
      </div>
      
      {/* Afternoon Module */}
      <div className="time-module-afternoon mb-2">
        <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
          <span className="text-xs text-primary font-medium">🌤️ Steady focus — check the pulse</span>
        </div>
      </div>
      
      {/* Evening/Night Module */}
      <div className="time-module-evening time-module-night mb-2">
        <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
          <span className="text-xs text-primary font-medium">🌆 Social flow — peak connection time</span>
        </div>
      </div>
      
      {/* Late Module */}
      <div className="time-module-late mb-2">
        <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
          <span className="text-xs text-primary font-medium">🌙 Intimate reflection — close connections</span>
        </div>
      </div>
    </div>
  );
};