export const BottomHud = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="
      fixed inset-x-0 bottom-[72px] z-[60]
      flex flex-col items-center gap-2 pointer-events-none
    ">
      {children}
    </div>
  )
}