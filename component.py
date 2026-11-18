import bpy
arm = bpy.context.object
for b in arm.data.bones:
    print(b.name)