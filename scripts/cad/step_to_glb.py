"""
STEP -> glTF (binary) with OpenCascade, keeping the assembly tree and product names.

  pip install cadquery-ocp
  python3 scripts/cad/step_to_glb.py drone.step raw.glb [deflection] [angle]

The output is large and uncompressed; run the project's pack script on it next
(e.g. scripts/cad/pack-drone.mjs). Raw STEP files stay out of git (.gitignore).
"""
import time, sys
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.TCollection import TCollection_ExtendedString, TCollection_AsciiString
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.RWGltf import RWGltf_CafWriter
from OCP.collections import IndexedDataMap_TCollection_AsciiString_TCollection_AsciiString as InfoMap
from OCP.Message import Message_ProgressRange
src, out = sys.argv[1], sys.argv[2]
lin = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4    # max chord deviation, in the STEP file's units
ang = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5    # max angle between facets, radians
t=time.time()
doc = TDocStd_Document(TCollection_ExtendedString("XmlOcaf"))
r = STEPCAFControl_Reader(); r.SetColorMode(True); r.SetNameMode(True)
assert r.ReadFile(src) == IFSelect_RetDone
r.Transfer(doc); print("read", round(time.time()-t)); sys.stdout.flush()
st = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())

shape = st.GetOneShape()
BRepMesh_IncrementalMesh(shape, lin, False, ang, True)
print("mesh", round(time.time()-t)); sys.stdout.flush()
w = RWGltf_CafWriter(TCollection_AsciiString(out), True)
w.SetMergeFaces(True)
from OCP.RWMesh import RWMesh_NameFormat
w.SetNodeNameFormat(RWMesh_NameFormat.RWMesh_NameFormat_ProductOrInstance)
w.SetMeshNameFormat(RWMesh_NameFormat.RWMesh_NameFormat_Product)
ok = w.Perform(doc, InfoMap(), Message_ProgressRange())
print("write", ok, round(time.time()-t))
