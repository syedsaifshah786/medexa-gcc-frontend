"use client";

import { useState } from "react";
import MedexaHeader from "@/components/MedexaHeader";

export default function GCCHeader() {
  const [searchValue, setSearchValue] = useState("");

  return <MedexaHeader searchValue={searchValue} onSearchChange={setSearchValue} />;
}
