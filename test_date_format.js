// 測試日期格式化函數
const testDateFormatting = () => {
  // 模擬週一基準日期
  const baselineDate = "2025-06-02"; // 週一
  
  const weekStart = new Date(baselineDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;
  const weekRange = `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`;
  
  console.log(`原始日期: ${baselineDate}`);
  console.log(`週期顯示: ${weekRange}`);
  console.log(`週開始: ${weekStart.toLocaleDateString()}`);
  console.log(`週結束: ${weekEnd.toLocaleDateString()}`);
  
  // 測試多個週次
  const testWeeks = [
    "2025-06-02", "2025-06-09", "2025-06-16", 
    "2025-06-23", "2025-06-30", "2025-07-07"
  ];
  
  console.log('\n所有週次格式:');
  testWeeks.forEach(date => {
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const range = `${formatDate(start)} ~ ${formatDate(end)}`;
    console.log(`${date} -> ${range}`);
  });
};

testDateFormatting();