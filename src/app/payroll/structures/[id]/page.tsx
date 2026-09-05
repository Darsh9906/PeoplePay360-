import SalaryStructureDetails from "@/src/views/payroll/SalaryStructureDetails"

export default async function SalaryStructureDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  return <SalaryStructureDetails id={resolvedParams.id} />
}
