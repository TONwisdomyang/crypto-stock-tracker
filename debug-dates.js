const now = new Date();
console.log('Current date:', now.toISOString());

const testDates = ['2025-08-04', '2025-07-28', '2025-07-21', '2025-07-14', '2025-07-07'];

testDates.forEach(dateStr => {
  const baselineDate = new Date(dateStr);
  const weekEnd = new Date(baselineDate);
  weekEnd.setDate(baselineDate.getDate() + 6);
  
  const isCompleted = weekEnd <= now;
  console.log(`Date: ${dateStr}, Week End: ${weekEnd.toISOString()}, Completed: ${isCompleted}`);
});