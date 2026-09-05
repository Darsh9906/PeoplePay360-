import SalaryRuleDetails from "@/src/pages/payroll/SalaryRuleDetails"

export default async function SalaryRuleDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  return <SalaryRuleDetails id={resolvedParams.id} />
}
