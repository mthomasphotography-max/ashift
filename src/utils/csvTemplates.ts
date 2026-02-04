export function generateOperatorsCSVTemplate(): string {
  const headers = [
    'Name',
    'FLT',
    'Canning',
    'MAB1',
    'MAB2',
    'Corona',
    'Kegging Inside',
    'Kegging Outside',
    'Keg Loading',
    'WMS',
    'SAP',
    'SAY',
    'Packaging',
    'Loaders',
    'Pilots',
    'SAP VL31N',
    'SAP VT01N',
    'SAP VL71',
    'SAP VL33N',
    'SAP VL03N',
    'SAP VT03N',
    'SAP COR3',
    'SAP ZC30',
    'Role',
    'Constraints',
    'Notes',
    'Skill Proficiency',
    'Priority Areas'
  ];

  const exampleSkillProficiency = JSON.stringify({
    kegging_inside: 'expert',
    kegging_outside: 'competent',
    pilots: 'partial',
    loaders: 'competent'
  });

  const examplePriorityAreas = JSON.stringify({
    kegging_inside: 'first_choice',
    loaders: 'second_choice'
  });

  const exampleRow = [
    'John Smith',
    'C',
    'S',
    'B',
    'B',
    'N',
    'C',
    'C',
    'C',
    'S',
    'C',
    'B',
    'N',
    'C',
    'B',
    'B',
    'B',
    'N',
    'C',
    'C',
    'B',
    'N',
    'B',
    'Supervisor/Multi-op',
    'Vision issues at night - FLT limitation',
    'Highly skilled in kegging, upskilling in other areas',
    `"${exampleSkillProficiency}"`,
    `"${examplePriorityAreas}"`
  ];

  return [
    headers.join(','),
    exampleRow.join(','),
    ''
  ].join('\n');
}

export function generateStaffPlanCSVTemplate(weekCommencing: string): string {
  const headers = [
    'Week Commencing',
    'Operator Name',
    'Day1',
    'Day2',
    'Night1',
    'Night2'
  ];

  const exampleRow = [
    weekCommencing,
    'John Smith',
    'Y',
    'Y',
    'Y',
    'H'
  ];

  return [
    headers.join(','),
    exampleRow.join(','),
    ''
  ].join('\n');
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
