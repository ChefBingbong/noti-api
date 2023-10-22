export const createPoolQueryName = (pool: string, tick: number) => {
  if (tick < 0) {
    return `pool${pool}tickminus${tick * -1}`;

  }
  return `pool${pool}tick${tick}`;
};

export const parsePoolAndTick = (queryName: string): { pool: string, tick: number } => {
  const params = queryName.replace(/^pool/, "").split("tick");
  if (params.length !== 2) {
    throw Error(`Incorrect Pool subQuery name. ${queryName}`);
  }
  if (params[1].includes("minus")) {
    const tick = params[1].replace(/minus/, "")
    return { pool: params[0], tick: Number(tick) * -1 };

  }
  return { pool: params[0], tick: Number(params[1]) };
};