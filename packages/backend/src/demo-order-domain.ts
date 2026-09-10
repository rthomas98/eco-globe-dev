export const demoStages = ['submitted','accepted','funded','dispatched','delivered','settled'] as const;
export function canAdvanceDemo(current:string, requested:string) {
  const index=demoStages.findIndex(stage=>stage===current);
  if(index<0 || current==='settled')return false;
  return requested==='cancelled' || requested===demoStages[index+1];
}
