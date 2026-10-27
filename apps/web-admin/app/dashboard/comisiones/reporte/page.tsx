import CommissionReport from './report-client'

export default async function CommissionReportPage({ searchParams }: { searchParams: Promise<{ localId?: string }> }) {
  const { localId = '' } = await searchParams
  return <CommissionReport localId={localId} />
}
